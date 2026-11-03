import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Digital Employee | MACS Digital Media',description:'A practical AI assistant for busy business owners. See what a digital employee could handle and talk with MACS about a tailored setup.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
