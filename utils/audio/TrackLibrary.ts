
import { TRACK_DATA_BOSS } from './tracks/BossTrack';
import { TRACK_DATA_LEVEL_1 } from './tracks/Level1Track';
import { TRACK_DATA_LEVEL_2 } from './tracks/Level2Track';
import { TRACK_DATA_LEVEL_3 } from './tracks/Level3Track';
import { TRACK_DATA_LEVEL_4 } from './tracks/Level4Track';
import { TRACK_DATA_INTRO } from './tracks/IntroTrack';

export const TRACK_LIBRARY = {
    INTRO: { name: 'SYSTEM BOOT', data: TRACK_DATA_INTRO },
    BOSS: { name: 'BOSS THEME', data: TRACK_DATA_BOSS },
    LEVEL_1: { name: 'SECTOR 1', data: TRACK_DATA_LEVEL_1 },
    LEVEL_2: { name: 'SECTOR 2', data: TRACK_DATA_LEVEL_2 },
    LEVEL_3: { name: 'SECTOR 3', data: TRACK_DATA_LEVEL_3 },
    LEVEL_4: { name: 'SECTOR 4', data: TRACK_DATA_LEVEL_4 },
};
