// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige automatiquement tout le monde vers le tableau de bord
  redirect('/dashboard');
}
