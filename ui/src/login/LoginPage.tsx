import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {LoginForm} from './LoginForm';
import Link from '@mui/material/Link';
import {DefaultPaper} from '../common/DefaultPaper';
import * as gqlVersion from '../gql/version';
import {useQuery} from '@apollo/client/react';
import {ServerVersion} from '../gql/types';

const footerLinkSx = {margin: '0 2px'};

export const LoginPage = () => {
    const {data: {version = gqlVersion.VersionDefault.version} = gqlVersion.VersionDefault} = useQuery<ServerVersion>(
        gqlVersion.Version
    );
    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '95%'}}>
            <Box>
                <DefaultPaper>
                    <Typography variant="h3" component="h1" gutterBottom={true} sx={{fontWeight: 800}}>
                        NIRVANA
                    </Typography>
                    <LoginForm />
                </DefaultPaper>
            </Box>
            <div style={{position: 'absolute', bottom: 10, display: 'flex'}}>
                <Typography variant="subtitle1" component="span" sx={footerLinkSx}>
                    <Link href="https://github.com/traggo/server">源代码</Link>
                </Typography>
                <Typography variant="subtitle1" component="span" sx={footerLinkSx}>
                    |
                </Typography>
                <Typography variant="subtitle1" component="span" sx={footerLinkSx}>
                    <Link href="https://github.com/traggo/server/issues">问题反馈</Link>
                </Typography>
                <Typography variant="subtitle1" component="span" sx={footerLinkSx}>
                    |
                </Typography>
                <Typography variant="subtitle1" component="span" sx={footerLinkSx}>
                    {version.name}@{version.commit.slice(0, 8)}
                </Typography>
            </div>
        </Box>
    );
};
