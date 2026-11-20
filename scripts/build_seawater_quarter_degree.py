"""Download exact WOA23 annual 1991–2020 quarter-degree subsets and derive rho0.

Dependencies: numpy, netCDF4, gsw. Original five-layer subsets are cached outside
public; repeat builds use that cache offline. Browser files are gzip-compressed
little-endian Float32, row major south-to-north, west-to-east; NaN means no data.
No coastline infilling, horizontal resampling or vertical interpolation occurs.
The app imports manifest.ts; validation records remain with the offline sources.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.request

import gsw
import netCDF4
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEPTHS = [0, 50, 200, 1000, 2000]
DAP_BASE = 'https://www.ncei.noaa.gov/thredds-ocean/dodsC/woa23/DATA'
FILE_BASE = 'https://www.ncei.noaa.gov/data/oceans/woa/WOA23/DATA'
PERIOD = '1991—2020 年平均'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stats(a: np.ndarray) -> dict:
    valid = np.isfinite(a)
    return {'validCells': int(valid.sum()), 'missingCells': int((~valid).sum()),
            'min': float(np.nanmin(a)), 'max': float(np.nanmax(a))}


def validate_raw_layer(data, key):
    values = np.asarray(np.ma.asarray(data).astype('f8').filled(np.nan))
    valid = np.isfinite(values)
    # DAP truncation can return an unmasked all-zero buffer without raising.
    # Both land and ocean must exist in a global source layer at these depths.
    if data.shape != (720,1440) or not 400000 < valid.sum() < 800000:
        raise ValueError(f'Invalid/truncated global {key} mask: {valid.sum()} valid')
    low,high = (-3,45) if key == 'temperature' else (0,50)
    if not np.all((values[valid]>=low)&(values[valid]<=high)) or np.nanstd(values)<.05:
        raise ValueError(f'Invalid/truncated {key} values')
    return values


def fetch_layer(dap_url, variable, source_index, key):
    for attempt in range(3):
        try:
            # Modest row blocks avoid a single large DAP response being cut off.
            with netCDF4.Dataset(dap_url) as remote:
                chunks = [remote[variable][0,source_index,start:start+180,:] for start in range(0,720,180)]
            # Each latitude strip contains valid nonzero ocean values; an all-zero
            # unmasked strip is another signature of a silently truncated DAP packet.
            for chunk in chunks:
                if np.ma.count(chunk) == chunk.size and np.all(np.asarray(chunk) == 0):
                    raise ValueError('Unmasked all-zero DAP strip')
            data = np.ma.concatenate(chunks,axis=0)
            validate_raw_layer(data,key)
            return data
        except (OSError,ValueError,RuntimeError) as error:
            print(f'Retrying {key} depth-index {source_index}: {error}',flush=True)
            if attempt==2:raise
            time.sleep(1)


def download_subset(key: str, source_dir: Path) -> Path:
    symbol = {'temperature': 't', 'salinity': 's'}[key]
    filename = f'woa23_decav91C0_{symbol}00_04.nc'
    remote_path = f'{key}/netcdf/decav91C0/0.25/{filename}'
    dap_url = f'{DAP_BASE}/{remote_path}'
    target = source_dir / filename.replace('.nc', '-five-depths.nc')
    if target.is_file():
        bad=[]
        with netCDF4.Dataset(target) as cached:
            indexes=list(map(int,cached.original_depth_indexes))
            for i in range(5):
                try:validate_raw_layer(cached[f'{symbol}_an'][0,i,:,:],key)
                except ValueError:bad.append(i)
        if bad:
            replacements=[fetch_layer(dap_url,f'{symbol}_an',indexes[i],key) for i in bad]
            with netCDF4.Dataset(target,'r+') as cached:
                for i,replacement in zip(bad,replacements):cached[f'{symbol}_an'][0,i,:,:]=replacement
            print(f'Repaired incomplete cache layers {bad}',flush=True)
        print(f'Using validated cached {target.name}', flush=True)
        return target
    # Archive original server descriptors; these include original source metadata.
    for suffix in ['dds', 'das']:
        with urllib.request.urlopen(f'{dap_url}.{suffix}', timeout=120) as response:
            (source_dir / f'{filename}.{suffix}').write_bytes(response.read())
    partial = target.with_suffix('.download.nc')
    with netCDF4.Dataset(dap_url) as source, netCDF4.Dataset(partial, 'w') as out:
        assert source.time_coverage_start == '1991-01-01'
        assert source.time_coverage_duration == 'P30Y'
        assert source.time_coverage_resolution == 'P01Y'
        lon, lat = np.asarray(source['lon'][:]), np.asarray(source['lat'][:])
        assert lon.shape == (1440,) and lat.shape == (720,)
        assert lon[0] == -179.875 and lat[0] == -89.875
        assert np.all(np.diff(lon) == .25) and np.all(np.diff(lat) == .25)
        levels = np.asarray(source['depth'][:])
        indexes = [int(np.flatnonzero(levels == depth)[0]) for depth in DEPTHS]
        field = source[f'{symbol}_an']
        assert field.units == ('degrees_celsius' if symbol == 't' else '1')
        out.setncatts({attr: source.getncattr(attr) for attr in source.ncattrs() if attr != '_NCProperties'})
        out.setncattr('original_file_url', f'{FILE_BASE}/{remote_path}')
        out.setncattr('original_opendap_url', dap_url)
        out.setncattr('subset_note', 'Exact original objectively analyzed values, depths 0,50,200,1000,2000m; no resampling')
        out.setncattr('original_depth_indexes', indexes)
        for name, values in [('lon', lon), ('lat', lat), ('depth', np.array(DEPTHS, dtype='f4'))]:
            out.createDimension(name, len(values))
            coord = out.createVariable(name, 'f4', (name,))
            coord[:] = values
            coord.setncatts({attr: source[name].getncattr(attr) for attr in source[name].ncattrs() if attr != '_FillValue'})
        out.createDimension('time', 1)
        time = out.createVariable('time', 'f4', ('time',))
        time[:] = source['time'][:]
        time.setncatts({attr: source['time'].getncattr(attr) for attr in source['time'].ncattrs() if attr != '_FillValue'})
        subset = out.createVariable(f'{symbol}_an', 'f4', ('time','depth','lat','lon'),
                                   fill_value=field.getncattr('_FillValue'), zlib=True, complevel=4)
        subset.setncatts({attr: field.getncattr(attr) for attr in field.ncattrs() if attr != '_FillValue'})
        for level, (depth, source_index) in enumerate(zip(DEPTHS, indexes)):
            print(f'Downloading {key} {depth}m ({source_index})', flush=True)
            data = fetch_layer(dap_url,f'{symbol}_an',source_index,key)
            subset[0, level, :, :] = data
            print(f'  valid {int(np.ma.count(data))}', flush=True)
            out.sync()
    partial.replace(target)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT / 'source-data' / 'quarter-degree')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'public' / 'seawater-properties' / 'woa23-quarter-degree')
    parser.add_argument('--manifest-output', type=Path, default=ROOT / 'src' / 'views' / 'seawater-properties' / 'manifest.ts')
    parser.add_argument('--raw-output-dir', type=Path, default=ROOT / 'source-data' / 'quarter-degree' / 'browser-raw')
    parser.add_argument('--compare-one-degree', type=Path)
    args = parser.parse_args()
    for directory in [args.source_dir, args.output_dir, args.raw_output_dir]: directory.mkdir(parents=True, exist_ok=True)
    args.manifest_output.parent.mkdir(parents=True, exist_ok=True)
    report = {'sources':{}, 'versions':{'numpy':np.__version__,'netCDF4':netCDF4.__version__,'gsw':gsw.__version__},'layers':{}}
    fields = {}
    for key, symbol in [('temperature','t'),('salinity','s')]:
        path = download_subset(key, args.source_dir)
        with netCDF4.Dataset(path) as nc:
            assert nc.time_coverage_start == '1991-01-01' and nc.time_coverage_duration == 'P30Y' and nc.time_coverage_resolution == 'P01Y'
            lon,lat,depths = np.asarray(nc['lon'][:]),np.asarray(nc['lat'][:]),np.asarray(nc['depth'][:])
            assert lon.size == 1440 and lat.size == 720 and depths.tolist() == DEPTHS
            assert lon[0] == -179.875 and lat[0] == -89.875 and np.all(np.diff(lon)==.25) and np.all(np.diff(lat)==.25)
            fields[key] = [validate_raw_layer(nc[f'{symbol}_an'][0,i,:,:],key) for i in range(5)]
            report['sources'][key] = {'originalUrl':nc.original_file_url,'opendapUrl':nc.original_opendap_url,
                'cachedSubset':path.name,'bytes':path.stat().st_size,'sha256':digest(path.read_bytes()),
                'originalCreation':nc.date_created.strip(),'variable':f'{symbol}_an','units':nc[f'{symbol}_an'].units,
                'timeCoverageStart':nc.time_coverage_start,'timeCoverageDuration':nc.time_coverage_duration,
                'timeCoverageResolution':nc.time_coverage_resolution,'originalDepthIndexes':list(map(int,nc.original_depth_indexes))}
    lon2d, lat2d = np.meshgrid(lon,lat)
    fields['density']=[]
    for i, depth in enumerate(DEPTHS):
        t,s = fields['temperature'][i],fields['salinity'][i]
        # These two WOA23 products share the same analysis-domain/bottom mask.
        # This also rejects an incomplete response affecting only one variable.
        assert np.array_equal(np.isfinite(t),np.isfinite(s)), f'T/S source masks differ at {depth}m; recheck the download'
        valid = np.isfinite(t)&np.isfinite(s)
        p=gsw.p_from_z(-float(depth),lat2d)
        sa=gsw.SA_from_SP(s,p,lon2d,lat2d)
        rho=np.asarray(gsw.pot_rho_t_exact(sa,t,p,0))
        rho[~valid]=np.nan
        assert np.array_equal(np.isfinite(rho),valid)
        assert np.all((rho[valid]>990)&(rho[valid]<1045))
        fields['density'].append(rho)
    example=float(gsw.pot_rho_t_exact(34.7118,28.7856,10,0))
    assert abs(example-1021.798145811089)<1e-9
    report['gswPublishedExampleCheck']={'computed':example,'expected':1021.798145811089,'passed':True}
    manifest={'version':1,'format':'float32-le-gzip','depths':DEPTHS,
      'grid':{'width':1440,'height':720,'lonStart':-179.875,'latStart':-89.875,'lonStep':.25,'latStep':.25},
      'layers':{},'metadata':{'period':PERIOD+'气候态','resolution':'0.25° × 0.25°（1440 × 720）',
        'densityMethod':'TEOS-10（GSW）计算位密度，参考海压 0 dbar；由同层温盐、经纬度和深度推算，非原位密度。',
        'description':'NOAA WOA23 原始四分之一度客观分析温盐场；保留各层缺测和海底掩膜；密度由同格温盐计算。'}}
    for key in ['temperature','salinity','density']:
        manifest['layers'][key]=[];report['layers'][key]=[]
        for depth,values in zip(DEPTHS,fields[key]):
            data=values.astype('<f4').tobytes(order='C')
            filename=f'{key}-{depth}m.bin.gz'
            compressed=gzip.compress(data,compresslevel=9,mtime=0)
            (args.output_dir/filename).write_bytes(compressed)
            (args.raw_output_dir/filename.removesuffix('.gz')).write_bytes(data)
            # Decode and check byte-exact transport, NaN positions and finite values.
            assert gzip.decompress(compressed)==data
            restored=np.frombuffer(data,dtype='<f4').reshape(values.shape)
            assert np.array_equal(np.isfinite(restored),np.isfinite(values))
            assert np.nanmax(np.abs(restored-values))<.0001
            item={'depth':depth,'file':filename,'bytes':len(data),'gzipBytes':len(compressed),
              'sha256':digest(data),'gzipSha256':digest(compressed),
              'units':{'temperature':'°C','salinity':'PSS-78','density':'kg/m³'}[key],
              'source':'NOAA WOA23' if key!='density' else 'NOAA WOA23 温盐 / TEOS-10 计算位密度（0 dbar）','date':PERIOD}
            manifest['layers'][key].append(item)
            report['layers'][key].append({'depth':depth,**stats(values),'float32MaxError':float(np.nanmax(np.abs(restored-values))),**item})
    report['checks']={'samePeriodAndGrid':True,'sourceMasksPreserved':True,'noHorizontalResampling':True,
      'noVerticalInterpolation':True,'noCoastalInfilling':True,'densityMaskIntersection':True,'transportRoundTrip':True}
    if args.compare_one_degree:
        old=json.loads(args.compare_one_degree.read_text(encoding='utf8'))
        report['comparisonToOneDegree']=[]
        area=np.cos(np.deg2rad(lat2d))
        for i,depth in enumerate(DEPTHS):
            old_valid=np.asarray([v is not None for v in old['layers']['temperature'][i]['values']]).reshape(180,360)
            old_expanded=np.repeat(np.repeat(old_valid,4,axis=0),4,axis=1)
            new_valid=np.isfinite(fields['temperature'][i])
            gained=new_valid&~old_expanded;lost=~new_valid&old_expanded
            report['comparisonToOneDegree'].append({'depth':depth,'oldValidAreaFraction':float(np.sum(area*old_expanded)/np.sum(area)),
              'newValidAreaFraction':float(np.sum(area*new_valid)/np.sum(area)),
              'newValidSubcellsInsideOldMissingCell':int(gained.sum()),'newMissingSubcellsInsideOldValidCell':int(lost.sum())})
    args.manifest_output.write_text(
        '// Generated by scripts/build_seawater_quarter_degree.py; imported directly by the lesson.\n'
        + 'export const oceanManifest = ' + json.dumps(manifest,ensure_ascii=False,indent=2) + ' as const\n',
        encoding='utf8')
    (args.source_dir/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'files':15,'gzipBytes':sum(x['gzipBytes'] for ls in manifest['layers'].values() for x in ls),
                      'output':str(args.output_dir),'manifest':str(args.manifest_output),
                      'validation':str(args.source_dir/'validation.json'),
                      'layers':{k:[{'depth':v['depth'],'validCells':v['validCells']} for v in vs] for k,vs in report['layers'].items()},
                      'comparisonToOneDegree':report.get('comparisonToOneDegree')},ensure_ascii=False,indent=2),flush=True)


if __name__=='__main__':main()
