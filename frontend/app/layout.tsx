import { redirect } from 'next/navigation';

export default function RootLayout() {
  // Redirect to the default locale (en) when accessing the root path
  redirect('/en');
}
