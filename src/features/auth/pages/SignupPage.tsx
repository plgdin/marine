import { Link } from 'react-router-dom';
import { ROUTES } from '@config/routes';
import { APP_NAME } from '@shared/utils/constants';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Create your account
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Start monitoring your fleet with {APP_NAME}
        </p>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} style={{ color: 'var(--color-text-accent)' }} className="font-medium">Sign in</Link>
      </p>
    </div>
  );
}
