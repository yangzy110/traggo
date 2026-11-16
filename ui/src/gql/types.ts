// Re-exports the generated types and names the nested result types which are used throughout the ui.
// The generated file is created by `yarn generate` (see codegen.ts).
import type {AddTimeSpan, Dashboards, ServerVersion, Stats, Tags, TimeSpans, Trackers} from './__generated__/graphql';

export * from './__generated__/graphql';

type Item<T> = NonNullable<T> extends ReadonlyArray<infer U> ? U : never;

export type Tags_tags = Item<Tags['tags']>;
export type Trackers_timers = Item<Trackers['timers']>;
export type TimeSpans_timeSpans_timeSpans = TimeSpans['timeSpans']['timeSpans'][number];
export type AddTimeSpan_createTimeSpan = NonNullable<AddTimeSpan['createTimeSpan']>;
export type ServerVersion_version = ServerVersion['version'];

export type Dashboards_dashboards = Item<Dashboards['dashboards']>;
export type Dashboards_dashboards_items = Dashboards_dashboards['items'][number];
export type Dashboards_dashboards_ranges = Dashboards_dashboards['ranges'][number];
export type Dashboards_dashboards_items_statsSelection_range = NonNullable<
    Dashboards_dashboards_items['statsSelection']['range']
>;

export type Stats_stats = Item<Stats['stats']>;
export type Stats_stats_entries = Item<Stats_stats['entries']>;
