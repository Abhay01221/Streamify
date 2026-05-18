import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import {  authOptions  } from '@/lib/auth-options';
import LandingPage from './page-landing';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/browse');
  }

  return <LandingPage />;
}
