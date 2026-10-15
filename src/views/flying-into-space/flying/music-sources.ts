import type { BackgroundTrack } from './background-music';

/** Full audio files supplied by the resource owner on the shared OSS media path. */
export const EXPLORATION_MUSIC: readonly BackgroundTrack[] = [
    {
        id: 'human-legacy', title: 'Human Legacy', artist: 'Ivan Torrent',
        src: '/geo-resources-folder/mp3/human-legacy.mp3',
    },
    {
        id: 'new-journey', title: '开启新征程', artist: '阿鲲',
        src: '/geo-resources-folder/mp3/开启新征程.mp3',
    },
];

export const EXPLORATION_MUSIC_REFERENCES = [
    {
        id: 'human-legacy',
        listen: 'https://www.youtube.com/watch?v=9NzlDUeS1U4',
        purchase: 'https://ivantorrent.bandcamp.com/album/reverie',
    },
    {
        id: 'new-journey',
        listen: 'https://www.youtube.com/watch?v=uqka8cWcMaE',
        album: 'https://music.apple.com/ca/song/1517722837',
    },
] as const;
