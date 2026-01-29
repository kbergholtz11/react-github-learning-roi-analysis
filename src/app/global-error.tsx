'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg"
          >
            <Card className="border-destructive/50">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
                >
                  <ShieldAlert className="h-10 w-10 text-destructive" />
                </motion.div>
                <CardTitle className="text-2xl">Critical Error</CardTitle>
              </CardHeader>

              <CardContent className="text-center">
                <p className="mb-4 text-muted-foreground">
                  A critical error occurred that prevented the application from loading.
                  Please try refreshing the page.
                </p>

                {error.digest && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Error Reference: <code className="font-mono">{error.digest}</code>
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={reset} variant="default" size="lg">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Homepage
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </body>
    </html>
  )
}
