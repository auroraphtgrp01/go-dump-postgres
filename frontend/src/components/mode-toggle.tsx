'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/theme-provider'
import { Moon, Sun } from "lucide-react"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant='ghost'
        size='icon'
        className='mt-0.5 h-7 select-none rounded-full !border-0 p-0 outline-none hover:bg-transparent focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0'
      >
        <Moon className='h-[1.2rem] w-[1.2rem]' />
        <span className='sr-only'>Chuyển đổi giao diện</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size='icon'
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <motion.div
        key='sun-icon'
        initial={{ opacity: 1, rotate: 0, scale: 1 }}
        animate={{
          opacity: theme === 'light' ? 1 : 0,
          rotate: theme === 'light' ? 0 : 90,
          scale: theme === 'light' ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <Sun className='h-[1.2rem] w-[1.2rem]' />
      </motion.div>

      <motion.div
        key='moon-icon'
        initial={{ opacity: 0, rotate: 90, scale: 0 }}
        animate={{
          opacity: theme === 'dark' ? 1 : 0,
          rotate: theme === 'dark' ? 0 : 90,
          scale: theme === 'dark' ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className='absolute'
      >
        <Moon className='h-[1.2rem] w-[1.2rem]' />
      </motion.div>
      <span className='sr-only'>Chuyển đổi giao diện</span>
    </Button>
  )
}
