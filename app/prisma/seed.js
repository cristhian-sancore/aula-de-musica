import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@aulamusica.com' },
    update: {},
    create: {
      name: 'Professor Admin',
      email: 'admin@aulamusica.com',
      password: hashedPassword,
      role: 'TEACHER',
    },
  })
  
  console.log('Criado usuário administrador:')
  console.log('Email: admin@aulamusica.com')
  console.log('Senha: admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
