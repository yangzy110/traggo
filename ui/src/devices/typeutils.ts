import {DeviceType} from '../gql/types';
import {expectNever} from '../utils/never';

export const deviceTypeToString = (type: DeviceType) => {
    switch (type) {
        case DeviceType.LongExpiry:
            return 'A month of inactivity';
        case DeviceType.ShortExpiry:
            return 'An hour of inactivity';
        case DeviceType.NoExpiry:
            return 'Never';
        default:
            return expectNever(type);
    }
};
