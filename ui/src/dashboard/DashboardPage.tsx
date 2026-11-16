import * as React from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import * as gqlDashboard from '../gql/dashboard';
import ReactGrid, {LayoutItem, WidthProvider} from 'react-grid-layout/legacy';
import {
    Dashboards,
    Dashboards_dashboards_items,
    UpdatePos,
    UpdatePosVariables,
    EntryType,
    StatsInterval,
    RemoveDashboardEntry,
    RemoveDashboardEntryVariables,
} from '../gql/types';
import {DashboardEntry} from './Entry/DashboardEntry';
import Button from '@mui/material/Button';
import clone from 'lodash.clonedeep';
import {EditPopup} from './Entry/EditPopup';
import {EditGlass} from './Entry/EditGlass';
import {Fade} from '../common/Fade';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {AddPopup} from './Entry/AddPopup';
import {Paper} from '@mui/material';
import {Center} from '../common/Center';
import {Navigate, useParams} from 'react-router-dom';
import {useSnackbar} from 'notistack';
import {DateRanges} from './DateRanges';
import {Range} from '../utils/range';
import {useStateAndDelegateWithDelayOnChange} from '../utils/hooks';

enum ViewType {
    Mobile = 'mobile',
    Desktop = 'desktop',
}

const cols: Record<ViewType, number> = {
    [ViewType.Mobile]: 4,
    [ViewType.Desktop]: 20,
};

const WidthAwareReactGrid = WidthProvider(ReactGrid);
const EditId = -1;
const newEntry = (): Dashboards_dashboards_items => {
    return {
        __typename: 'DashboardEntry',
        title: '',
        id: EditId,
        entryType: EntryType.PieChart,
        statsSelection: {
            __typename: 'StatsSelection',
            interval: StatsInterval.Single,
            range: {
                __typename: 'RelativeOrStaticRange',
                from: 'now-1w/w',
                to: 'now-1w/w',
            },
            rangeId: null,
            tags: [],
            excludeTags: [],
            includeTags: [],
        },
        pos: {
            __typename: 'ResponsiveDashboardEntryPos',
            [ViewType.Desktop]: {
                x: 0,
                y: 0,
                h: 6,
                w: 6,
                minH: 0,
                minW: 0,
                __typename: 'DashboardEntryPos',
            },
            [ViewType.Mobile]: {
                x: 0,
                y: 0,
                h: 5,
                w: 2,
                minH: 0,
                minW: 0,
                __typename: 'DashboardEntryPos',
            },
        },
        total: false,
    };
};

// Shows the message and redirects, the message must not be enqueued while rendering.
const RedirectToDashboards: React.FC<{message: string}> = ({message}) => {
    const {enqueueSnackbar} = useSnackbar();
    React.useEffect(() => {
        enqueueSnackbar(message, {variant: 'warning'});
    }, [enqueueSnackbar, message]);
    return <Navigate to="/dashboards" replace />;
};

export const DashboardPage: React.FC = () => {
    const params = useParams<{id: string}>();
    const [addRef, setAddRef] = React.useState<null | HTMLElement>(null);
    const endRef = React.useRef<null | HTMLDivElement>(null);
    const [changeMode, setChangeMode] = React.useState(false);
    const [viewType, setViewType] = React.useState<ViewType>(ViewType.Desktop);
    const [preview, setPreview] = React.useState(false);
    const [diagramRanges, setDiagramRanges] = React.useState<Record<number, Range>>({});
    const [ranges, setRanges] = useStateAndDelegateWithDelayOnChange<Record<number, Range>>({}, setDiagramRanges, 2000);
    const [addEntry, setAddEntry] = React.useState<null | Dashboards_dashboards_items>(null);
    const [[editElement, editEntry], setEdit] = React.useState<[null] | [HTMLElement, Dashboards_dashboards_items]>([null]);
    const {loading, data, error} = useQuery<Dashboards>(gqlDashboard.Dashboards);
    const [updatePos] = useMutation<UpdatePos, UpdatePosVariables>(gqlDashboard.UpdatePos, {
        refetchQueries: [{query: gqlDashboard.Dashboards}],
    });
    const [removeDashboardEntry] = useMutation<RemoveDashboardEntry, RemoveDashboardEntryVariables>(
        gqlDashboard.RemoveDashboardEntry,
        {
            refetchQueries: [{query: gqlDashboard.Dashboards}],
        }
    );
    if (loading) {
        return <CenteredSpinner />;
    }
    if (error || !data) {
        return <span>加载失败</span>;
    }

    const dashboards = data.dashboards || [];

    if (!params.id) {
        return <RedirectToDashboards message="id parameter is missing in url" />;
    }
    const dashboard = dashboards.find((db) => '' + db.id === params.id);
    if (!dashboard) {
        return <RedirectToDashboards message="dashboard does not exist" />;
    }

    const dashboardEntries = dashboard.items;

    const l: LayoutItem[] = dashboard.items.map((item) => ({
        i: '' + item.id,
        x: item.pos[viewType].x,
        w: item.pos[viewType].w,
        h: item.pos[viewType].h,
        y: item.pos[viewType].y,
        minH: item.pos[viewType].minH,
        minW: item.pos[viewType].minW,
    }));
    const maxY = l.reduce((a, b) => Math.max(a, b.y + b.h), 0);
    if (addEntry) {
        const newEntryLayout: LayoutItem = {i: '' + EditId, ...addEntry.pos[viewType], y: maxY, static: true};
        l.push(newEntryLayout);
    }

    const rangeToName = () =>
        dashboard.ranges.reduce(
            (a, range) => ({...a, [range.id]: `${range.name} (${range.range.from} - ${range.range.to})`}),
            {}
        );

    const indexedRanges = dashboard.ranges.reduce((a, range) => ({...a, [range.id]: diagramRanges[range.id] || range.range}), {});

    const updatePosHandler = (_1: unknown, _2: unknown, newItem: LayoutItem | null) => {
        if (!newItem) {
            return;
        }
        updatePos({
            variables: {
                entryId: parseInt(newItem.i, 10),
                pos: {[viewType]: {x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h}},
            },
        }).then(console.log);
    };

    return (
        <>
            <div style={{display: 'flex'}}>
                <div style={{flex: 1}}>
                    <DateRanges setRanges={setRanges} ranges={ranges} changeMode={changeMode} dashboard={dashboard} />
                </div>
                <div>
                    {changeMode ? (
                        <Button
                            onClick={() => setViewType(viewType === ViewType.Desktop ? ViewType.Mobile : ViewType.Desktop)}
                            variant={'outlined'}
                            style={{marginRight: 10}}>
                            {viewType === ViewType.Mobile ? 'Desktop View' : 'Mobile View'}
                        </Button>
                    ) : null}
                    {changeMode ? (
                        <Button
                            onClick={() => {
                                setAddEntry(newEntry());
                                endRef.current!.scrollIntoView({behavior: 'smooth'});
                            }}
                            variant={'outlined'}
                            style={{marginRight: 10}}>
                            添加条目
                        </Button>
                    ) : null}
                    <Button
                        onClick={() => {
                            setViewType(ViewType.Desktop);
                            setChangeMode(!changeMode);
                        }}
                        variant={'outlined'}
                        color={'primary'}
                        style={{marginRight: 10}}>
                        {changeMode ? '退出编辑' : '编辑仪表盘'}
                    </Button>
                </div>
            </div>
            <div
                style={
                    viewType === ViewType.Desktop
                        ? {}
                        : {borderRight: '5px dotted grey', borderLeft: '5px dotted grey', maxWidth: 700, margin: '0 auto'}
                }>
                <WidthAwareReactGrid
                    key={viewType}
                    cols={cols[viewType]}
                    className="layout"
                    rowHeight={50}
                    preventCollision={true}
                    useCSSTransforms={false}
                    autoSize={true}
                    layout={l}
                    onDragStop={updatePosHandler}
                    onResizeStop={updatePosHandler}
                    compactType={null}
                    isResizable={changeMode}
                    isDraggable={changeMode}>
                    {dashboardEntries.map((entry) => {
                        const currentEditedAndPreviewed = preview && editEntry && editEntry.id === entry.id;
                        return (
                            <div key={'' + entry.id}>
                                <DashboardEntry ranges={indexedRanges} entry={currentEditedAndPreviewed ? editEntry! : entry} />
                                {changeMode ? (
                                    <Fade fullyVisible={!currentEditedAndPreviewed} opacity={0}>
                                        <EditGlass
                                            doEdit={(elm) => setEdit([elm, clone(entry)])}
                                            doDelete={() => removeDashboardEntry({variables: {id: entry.id}})}
                                        />
                                    </Fade>
                                ) : null}
                            </div>
                        );
                    })}
                    {addEntry ? (
                        <div
                            key={'' + EditId}
                            ref={(ref: HTMLDivElement | null) => {
                                setAddRef(ref);
                                if (ref) {
                                    ref.scrollIntoView({behavior: 'smooth'});
                                }
                            }}>
                            {preview ? (
                                <DashboardEntry ranges={indexedRanges} key="uff" entry={addEntry} />
                            ) : (
                                <Paper style={{width: '100%', height: '100%'}}>
                                    <Center>新建条目</Center>
                                </Paper>
                            )}

                            {addRef ? (
                                <AddPopup
                                    maxY={maxY}
                                    dashboardId={dashboard.id}
                                    preview={preview}
                                    ranges={rangeToName()}
                                    doPreview={setPreview}
                                    entry={addEntry}
                                    anchorEl={addRef}
                                    onChange={(e) => {
                                        return setAddEntry(clone(e));
                                    }}
                                    finish={() => {
                                        setAddEntry(null);
                                        setAddRef(null);
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : (
                        []
                    )}
                </WidthAwareReactGrid>
            </div>
            {editElement !== null && editEntry !== null ? (
                <EditPopup
                    preview={preview}
                    ranges={rangeToName()}
                    doPreview={setPreview}
                    entry={editEntry!}
                    anchorEl={editElement}
                    onChange={(entry) => {
                        if (entry === null) {
                            setEdit([null]);
                        } else {
                            setEdit([editElement, entry]);
                        }
                    }}
                />
            ) : null}
            <div ref={endRef} />
        </>
    );
};
