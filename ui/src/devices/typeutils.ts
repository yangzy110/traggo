import {DeviceType} from '../gql/types';
import {expectNever} from '../utils/never';

export const deviceTypeToString = (type: DeviceType) => {
    switch (type) {
        case DeviceType.LongExpiry:
            return '一个月无活动后过期';
        case DeviceType.ShortExpiry:
            return '一小时无活动后过期';
        case DeviceType.NoExpiry:
            return '永不过期';
        default:
            return expectNever(type);
    }
};
