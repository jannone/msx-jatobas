import '../styles.css'
import type { AppProps } from 'next/app'

export default function JatobasApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
