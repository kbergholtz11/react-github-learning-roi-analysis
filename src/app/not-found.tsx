'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Search, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted"
            >
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-2 text-4xl font-bold tracking-tight"
            >
              404
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-2 text-xl font-semibold"
            >
              Page Not Found
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8 text-muted-foreground"
            >
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Button asChild variant="default">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/journey/explorer">
                  <Search className="mr-2 h-4 w-4" />
                  Search Learners
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-center text-sm text-muted-foreground"
        >
          Need help?{' '}
          <Link href="/admin/settings" className="underline hover:text-foreground">
            Contact support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
