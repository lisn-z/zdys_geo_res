Attributes {
    lon {
        String units "degrees_east";
        String long_name "Longitude";
        Float32 actual_range 0.0, 357.5;
        String standard_name "longitude";
        String axis "X";
    }
    time {
        String long_name "Time";
        String delta_t "0000-01-00 00:00:00";
        String prev_avg_period "0000-00-01 00:00:00";
        String standard_name "time";
        String axis "T";
        String units "hours since 1800-01-01 00:00:0.0";
        Float64 actual_range 1297320.0, 1981824.0;
        UInt32 _ChunkSizes 1;
    }
    lat {
        String units "degrees_north";
        Float32 actual_range 90.0, -90.0;
        String long_name "Latitude";
        String standard_name "latitude";
        String axis "Y";
    }
    slp {
        String long_name "Sea Level Pressure";
        Float32 valid_range 870.0, 1150.0;
        String units "millibars";
        Float32 add_offset 0.0;
        Float32 scale_factor 1.0;
        Float32 missing_value -9.96921E36;
        Int16 precision 1;
        Int16 least_significant_digit 1;
        String var_desc "Sea Level Pressure";
        String level_desc "Sea Level";
        String statistic "Mean";
        String parent_stat "Other";
        String dataset "NCEP Reanalysis Derived Products";
        Float32 actual_range 955.56085, 1082.5582;
        UInt32 _ChunkSizes 1, 73, 144;
    }
    NC_GLOBAL {
        String description "Data is from NMC initialized reanalysis
(4x/day).  These are the 0.9950 sigma level values.";
        String platform "Model";
        String Conventions "COARDS";
        String NCO "20121012";
        String history "Thu May  4 18:12:35 2000: ncrcat -d time,0,622 /Datasets/ncep.reanalysis.derived/surface/slp.mon.mean.nc ./surface/slp.mon.mean.nc
Mon Jul  5 23:22:35 1999: ncrcat slp.mon.mean.nc /Datasets/ncep.reanalysis.derived/surface/slp.mon.mean.nc /dm/dmwork/nmc.rean.ingest/combinedMMs/slp.mon.mean.nc
/home/hoop/crdc/cpreanjuke2farm/cpreanjuke2farm Thu Oct 26 23:42:16 1995 from pre.sig995.85.nc
created 95/02/06 by Hoop (netCDF2.3)
Converted to chunked, deflated non-packed NetCDF4 2014/09";
        String title "monthly mean slp from the NCEP Reanalysis";
        String dataset_title "NCEP-NCAR Reanalysis 1";
        String _NCProperties "version=2,netcdf=4.6.2,hdf5=1.8.20";
        String References "http://www.psl.noaa.gov/data/gridded/data.ncep.reanalysis.derived.html";
    }
    DODS_EXTRA {
        String Unlimited_Dimension "time";
    }
}
