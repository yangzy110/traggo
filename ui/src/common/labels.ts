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
    MaterialLight: '浅色',
    MaterialDark: '深色',
};

export const dateLocaleLabels: Record<string, string> = {
    Chinese: '中文',
    American: 'English',
};

export const label = (labels: Record<string, string>, value: string): string => labels[value] || value;
