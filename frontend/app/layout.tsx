import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Handle root path redirect on the server side
  const pathname = (await headers()).get('x-pathname') || '';
  
  if (pathname === '/') {
    redirect('/en');
  }

  return <>{children}</>;
}
