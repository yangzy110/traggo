import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
    overwrite: true,
    schema: '../schema.graphql',
    documents: ['src/**/*.{ts,tsx}', '!src/gql/__generated__/**'],
    ignoreNoDocuments: true,
    generates: {
        // Import the types via src/gql/types.ts
        'src/gql/__generated__/graphql.ts': {
            plugins: ['typescript-operations'],
            config: {
                // `query Foo` generates the types `Foo` and `FooVariables`
                omitOperationSuffix: true,
                // `StatsInterval.Daily` is used as value, so real enums are needed
                enumType: 'native',
                // keep the enum member names of the schema (f.ex. `American24h`)
                namingConvention: {enumValues: 'keep'},
                // nullable fields are `T | null` and not optional
                avoidOptionals: {field: true, inputValue: false},
                // Apollo Client always adds the `__typename` field
                nonOptionalTypename: true,
                skipTypeNameForRoot: true,
                scalars: {Time: 'any'},
            },
        },
    },
};

export default config;
