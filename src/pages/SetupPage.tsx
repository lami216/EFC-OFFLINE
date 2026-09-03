import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import { EFC_LOGO_DATA_URL } from '../lib/brand';
import { Button, Card, Input } from '../components/ui';

type SetupForm = {
  centerName: string;
  phone1: string;
  phone2?: string;
  address?: string;
  adminName: string;
  password: string;
  initialReceipt: number;
};

function readableError(error: unknown) {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'تعذر إنشاء المركز. تأكد من البيانات ثم حاول مرة أخرى.';
}

export function SetupPage({ done }: { done: () => void }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SetupForm>({ defaultValues: { initialReceipt: 1 } });

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    try {
      // HTML number inputs are strings by default. valueAsNumber below is required
      // because the Rust SetupInput expects initialReceipt as an i64.
      await api.setup(values);
      done();
    } catch (err) {
      console.error('first_run_setup failed', err);
      setError(readableError(err));
    }
  });

  return (
    <div className="setup">
      <Card>
        <div className="setup-head">
          <div
            aria-label="شعار EFC"
            style={{
              width: 132,
              height: 86,
              margin: '0 auto 12px',
              display: 'grid',
              placeItems: 'center',
              background: '#fff',
              border: '1px solid #e2e7e5',
              borderRadius: 14,
              padding: 8,
            }}
          >
            <img
              src={EFC_LOGO_DATA_URL}
              alt="EFC"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <h1>تهيئة مركز التدريب</h1>
          <p>أدخل بيانات المركز وأنشئ أول حساب مدير. لن تُضاف أي بيانات تجريبية.</p>
        </div>
        <form onSubmit={onSubmit} className="grid two">
          <label>
            اسم المركز
            <Input required {...register('centerName')} />
          </label>
          <label>
            رقم الهاتف الأول
            <Input required {...register('phone1')} />
          </label>
          <label>
            رقم الهاتف الثاني
            <Input {...register('phone2')} />
          </label>
          <label>
            العنوان
            <Input {...register('address')} />
          </label>
          <label>
            اسم المدير
            <Input required {...register('adminName')} />
          </label>
          <label>
            كلمة المرور
            <Input required minLength={8} type="password" {...register('password')} />
          </label>
          <label>
            بداية أرقام الوصول
            <Input
              required
              min={1}
              step={1}
              type="number"
              {...register('initialReceipt', { valueAsNumber: true, min: 1 })}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="wide"
              style={{ margin: 0, color: 'var(--danger, #b42318)', fontWeight: 700 }}
            >
              {error}
            </p>
          )}

          <Button className="wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ إنشاء المركز…' : 'إنشاء المركز بأمان'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
