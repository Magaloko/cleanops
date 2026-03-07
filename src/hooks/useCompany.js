import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

let cached = null

export function useCompany() {
  const [companyId, setCompanyId] = useState(cached)

  useEffect(() => {
    if (cached) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('company_id').eq('id', user.id).single()
        .then(({ data }) => {
          cached = data?.company_id ?? null
          setCompanyId(cached)
        })
    })
  }, [])

  return companyId
}
