import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardIndex() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('kyu_session')?.value;
  
  if (!sessionStr) redirect('/login');
  
  const session = JSON.parse(sessionStr);

  if (session.role === 'SUPERADMIN') redirect('/dashboard/admin');
  if (session.role === 'HR') redirect('/dashboard/hr');
  if (session.role === 'PRINTER') redirect('/dashboard/printer');
  if (session.role === 'MEDIAOFFICER') redirect('/dashboard/media');
  if (session.role === 'ISSUANCE') redirect('/dashboard/issuance');
  
  redirect('/');
}
