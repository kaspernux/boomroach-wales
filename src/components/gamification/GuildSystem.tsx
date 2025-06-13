// À créer dans un fichier séparé, exemple : useGuildSystem.ts
import { useEffect, useState } from 'react'

export function useGuildSystem() {
  const [guild, setGuild] = useState<Guild | null>(null)
  const [members, setMembers] = useState<GuildMember[]>([])
  const [guildQuests, setGuildQuests] = useState<GuildQuest[]>([])

  useEffect(() => {
    // Remplace par tes appels API/backend temps réel
    fetch('/api/guild')
      .then(res => res.json())
      .then(data => setGuild(data))
    fetch('/api/guild/members')
      .then(res => res.json())
      .then(data => setMembers(data))
    fetch('/api/guild/quests')
      .then(res => res.json())
      .then(data => setGuildQuests(data))
  }, [])

  return { guild, members, guildQuests }
}
