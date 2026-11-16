// Chinese labels of the enums of the api.
export const entryTypeLabels: Record<string, string> = {
    PieChart: '饼图',
    BarChart: '柱状图',
    StackedBarChart: '堆叠柱状图',
    LineChart: '折线图',
    VerticalTable: '纵向表格',
    HorizontalTable: '横向表格',
};

export const intervalLabels: Record<string, string> = {
    Hourly: '每小时',
    Daily: '每天',
    Weekly: '每周',
    Monthly: '每月',
    Yearly: '每年',
    Single: '合计',
};

export const themeLabels: Record<string, string> = {
    GruvboxDark: 'Gruvbox 深色',
    GruvboxLight: 'Gruvbox 浅色',
    MaterialDark: 'Material 深色',
    MaterialLight: 'Material 浅色',
};

export const dateLocaleLabels: Record<string, string> = {
    Chinese: '中文',
    American: '美式（12 小时制）',
    American24h: '美式（24 小时制）',
    German: '德式',
    Australian: '澳大利亚式',
    British: '英式',
};

export const weekDayLabels: Record<string, string> = {
    Sunday: '星期日',
    Monday: '星期一',
    Tuesday: '星期二',
    Wednesday: '星期三',
    Thursday: '星期四',
    Friday: '星期五',
    Saturday: '星期六',
};

export const inputStyleLabels: Record<string, string> = {
    Fancy: '选择器',
    Native: '浏览器原生',
};

export const label = (labels: Record<string, string>, value: string): string => labels[value] || value;
