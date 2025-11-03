"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function WalletPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to profile page
    router.push('/dashboard/profile')
  }, [router])

  return null
}
