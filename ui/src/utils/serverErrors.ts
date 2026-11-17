// The server answers in English, the messages are shown in Chinese.
const messages: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^username\/password combination does not exist/, () => '用户名或密码错误'],
    [/^you need to login/, () => '请先登录'],
    [/^permission denied/, () => '没有权限'],
    [/^dashboard does not exist/, () => '仪表盘不存在'],
    [/^entry does not exist/, () => '条目不存在'],
    [/^dashboard range does not exist/, () => '日期范围不存在'],
    [/^device not found/, () => '设备不存在'],
    [/^at least one tag is required/, () => '至少需要一个标签'],
    [/^fromInclusive must be before toInclusive/, () => '开始时间必须早于结束时间'],
    [/^range is used in entries: (.*)/, (m) => `日期范围正在被使用: ${m[1]}`],
    [/^ranges may not be empty/, () => '日期范围不能为空'],
    [/^the requested range must not be longer than (\d+) days/, (m) => `时间范围不能超过 ${m[1]} 天`],
    [/^tag '(.*)' does not exist/, (m) => `标签“${m[1]}”不存在`],
    [/^tag '(.*)' is used by (\d+) time spans/, (m) => `标签“${m[1]}”关联着 ${m[2]} 条记录，不能删除，请改为停用`],
    [/^tag '(.*)' is archived/, (m) => `标签“${m[1]}”已停用，不能再使用`],
    [/^tag '(.*)' is present multiple times/, (m) => `标签“${m[1]}”重复`],
    [/^tag '(.*)' is present in both exclude tags and include tags/, (m) => `标签“${m[1]}”同时出现在排除和包含中`],
    [
        /^tag '(.*)' is used in dashboard '(.*)' entry '(.*)', remove/,
        (m) => `标签“${m[1]}”被仪表盘“${m[2]}”的条目“${m[3]}”使用，请先移除引用`,
    ],
    [/^the shared tag '(.*)' can only be changed by an admin/, (m) => `公用标签“${m[1]}”只有管理员可以修改`],
    [/^only admins can create tags/, () => '只有管理员可以创建标签'],
    [/^only admins can share tags/, () => '只有管理员可以共享标签'],
    [/^tag must not be empty/, () => '标签不能为空'],
    [/^tag must not contain spaces/, () => '标签不能包含空格'],
    [/^tag with key '(.*)' does already exist as a shared tag/, (m) => `已存在同名的公用标签“${m[1]}”`],
    [/^tag with key '(.*)' does already exist/, (m) => `标签“${m[1]}”已存在`],
    [/^tag with key '(.*)' does not exist/, (m) => `标签“${m[1]}”不存在`],
    [/^time ?span with id (\d+) does not exist/, () => '记录不存在'],
    [/^timespan with id (\d+) has already an end date/, () => '记录已经结束'],
    [/^user with id (\d+) does not exist/, () => '用户不存在'],
    [/^user with name '(.*)' does already exist/, (m) => `用户“${m[1]}”已存在`],
    [/^time span overlaps with another time span/, () => '与已有记录的时间重叠'],
    [/^start must be before end/, () => '开始时间必须早于结束时间'],
    [/^range start must be before range end/, () => '开始时间必须早于结束时间'],
    [/^failed to update tag filters/, () => '更新标签过滤失败'],
];

export const translateServerError = (message: string): string => {
    for (const [pattern, translate] of messages) {
        const match = message.match(pattern);
        if (match) {
            return translate(match);
        }
    }
    return message;
};
