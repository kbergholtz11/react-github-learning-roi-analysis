'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application Error:', error)
  }, [error])

  return (
    <div 
      className="flex min-h-[80vh] items-center justify-center p-4" 
      role="alert" 
      aria-live="assertive"
      aria-atomic="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
          <CardHeader className="text-center">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
              aria-hidden="true"
            >
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </motion.div>
            <CardTitle className="text-2xl" tabIndex={-1} id="error-heading">Something went wrong!</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
            </p>
            
            {error.digest && (
              <div className="mb-4 rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  Error ID: <code className="font-mono">{error.digest}</code>
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  <Bug className="mr-1 inline h-4 w-4" />
                  Technical Details
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
                  <code>{error.message}</code>
                  {error.stack && (
                    <>
                      {'\n\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center text-sm text-muted-foreground"
        >
          If this problem persists,{' '}
          <Link href="/admin/settings" className="underline hover:text-foreground">
            contact support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
