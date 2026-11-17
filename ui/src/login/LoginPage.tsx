import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import {alpha, keyframes, type SxProps, type Theme} from '@mui/material/styles';
import {LoginForm} from './LoginForm';

const float = keyframes`
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(40px, -30px, 0) scale(1.15); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
`;
const rise = keyframes`
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
`;
const shine = keyframes`
    to { background-position: 200% center; }
`;

const orb = (size: number, color: (theme: Theme) => string, position: Record<string, string>, delay: number): SxProps<Theme> => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    background: (theme) => `radial-gradient(circle at 30% 30%, ${color(theme)}, transparent 70%)`,
    filter: 'blur(60px)',
    opacity: 0.7,
    animation: `${float} 16s ease-in-out ${delay}s infinite`,
    '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
    ...position,
});

export const LoginPage = () => {
    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: 2,
                backgroundColor: 'background.default',
            }}>
            <Box sx={orb(480, (t) => t.palette.primary.main, {top: '-10%', left: '-8%'}, 0)} />
            <Box sx={orb(420, (t) => t.palette.secondary.main, {bottom: '-12%', right: '-6%'}, -5)} />
            <Box sx={orb(320, (t) => t.palette.primary.light, {top: '45%', left: '55%'}, -10)} />
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: (t) =>
                        `linear-gradient(${alpha(t.palette.text.primary, 0.04)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(
                            t.palette.text.primary,
                            0.04
                        )} 1px, transparent 1px)`,
                    backgroundSize: '48px 48px',
                    maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
                }}
            />
            <Paper
                elevation={0}
                sx={(theme) => ({
                    position: 'relative',
                    width: '100%',
                    maxWidth: 400,
                    padding: theme.spacing(5, 4, 4),
                    textAlign: 'center',
                    borderRadius: '24px',
                    backgroundColor: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(24px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                    border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.12 : 0.7)}`,
                    boxShadow: `0 24px 80px ${alpha(theme.palette.primary.main, 0.25)}, 0 2px 0 ${alpha(
                        theme.palette.common.white,
                        theme.palette.mode === 'dark' ? 0.06 : 0.8
                    )} inset`,
                    animation: `${rise} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both`,
                    '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
                })}>
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom={true}
                    sx={(theme) => ({
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                        animation: `${shine} 6s linear infinite`,
                        '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
                    })}>
                    NIRVANA
                </Typography>
                <LoginForm />
            </Paper>
        </Box>
    );
};
