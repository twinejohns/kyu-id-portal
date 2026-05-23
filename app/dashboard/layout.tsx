import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SidebarClientWrapper from './SidebarClientWrapper';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('kyu_session')?.value;

  if (!sessionStr) {
    redirect('/login');
  }

  const session = JSON.parse(sessionStr);

  return (
    <SidebarClientWrapper session={session}>
      {children}
    </SidebarClientWrapper>
  );
}
