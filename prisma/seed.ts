import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const guru = await prisma.user.upsert({
    where: { email: "guru@bengkelkode.id" },
    update: {},
    create: {
      name: "Pak Ahmad",
      email: "guru@bengkelkode.id",
      passwordHash,
      role: "GURU",
    },
  });

  const siswa1 = await prisma.user.upsert({
    where: { email: "siswa1@bengkelkode.id" },
    update: {},
    create: {
      name: "Ahmad Fauzan",
      email: "siswa1@bengkelkode.id",
      passwordHash,
      role: "SISWA",
    },
  });

  const siswa2 = await prisma.user.upsert({
    where: { email: "siswa2@bengkelkode.id" },
    update: {},
    create: {
      name: "Bunga Amelia",
      email: "siswa2@bengkelkode.id",
      passwordHash,
      role: "SISWA",
    },
  });

  const kelas = await prisma.kelas.upsert({
    where: { joinCode: "RPL2XI" },
    update: {},
    create: {
      name: "XI RPL 2",
      joinCode: "RPL2XI",
      guruId: guru.id,
    },
  });

  for (const siswa of [siswa1, siswa2]) {
    await prisma.kelasMember.upsert({
      where: {
        kelasId_userId: { kelasId: kelas.id, userId: siswa.id },
      },
      update: {},
      create: {
        kelasId: kelas.id,
        userId: siswa.id,
      },
    });
  }

  const tagFlexStart = await prisma.conceptTag.upsert({
    where: { name: "salah-nilai-justify-content" },
    update: {},
    create: { name: "salah-nilai-justify-content" },
  });

  const tagLupaDisplay = await prisma.conceptTag.upsert({
    where: { name: "lupa-display-flex" },
    update: {},
    create: { name: "lupa-display-flex" },
  });

  const tagSalahEja = await prisma.conceptTag.upsert({
    where: { name: "salah-eja-properti" },
    update: {},
    create: { name: "salah-eja-properti" },
  });

  const soalPS = await prisma.soal.create({
    data: {
      title: "Navigasi Flexbox",
      description:
        "Menu navigasi pada situs latihan tampil menumpuk tidak rata. Perbaiki kode Flexbox berikut supaya 4 menu tersusun rata kanan-kiri (space-between), tanpa mengubah struktur HTML.",
      learningModel: "PROBLEM_SOLVING",
      topic: "CSS Layout & Flexbox",
      difficulty: 2,
      status: "APPROVED",
      createdById: guru.id,
      starterCode: `.navbar {\n  display: flex;\n  justify-content: /* lengkapi */;\n}`,
      language: "css",
      conceptTags: { connect: [{ id: tagFlexStart.id }, { id: tagLupaDisplay.id }, { id: tagSalahEja.id }] },
    },
  });

  await prisma.testCase.createMany({
    data: [
      {
        soalId: soalPS.id,
        input: "",
        expected: "display: flex",
        label: "Elemen .navbar memakai display: flex",
        order: 1,
        conceptTagId: tagLupaDisplay.id,
      },
      {
        soalId: soalPS.id,
        input: "",
        expected: "justify-content: space-between",
        label: "Menu tersusun rata dengan justify-content: space-between",
        order: 2,
        conceptTagId: tagFlexStart.id,
      },
      {
        soalId: soalPS.id,
        input: "",
        expected: "no-html-change",
        label: "Struktur HTML tidak diubah",
        order: 3,
      },
    ],
  });

  const soalTF = await prisma.soal.create({
    data: {
      title: "Refleksi: Aplikasi Favoritmu",
      description:
        "Ceritakan satu aplikasi atau website yang sering kamu pakai sehari-hari. Menurutmu, bagian mana dari tampilannya yang paling nyaman digunakan, dan kenapa?",
      learningModel: "TRANSFORMATIF",
      topic: "Studi Kasus Web",
      difficulty: 1,
      status: "APPROVED",
      createdById: guru.id,
    },
  });

  await prisma.rubricCriterion.createMany({
    data: [
      { soalId: soalTF.id, name: "Kedalaman Refleksi", description: "Seberapa detail siswa menjelaskan pengalaman dan alasannya", maxScore: 4, order: 1 },
      { soalId: soalTF.id, name: "Kaitan dengan Konsep", description: "Seberapa baik siswa mengaitkan pengalaman dengan konsep UI/UX", maxScore: 4, order: 2 },
      { soalId: soalTF.id, name: "Kejelasan Penulisan", description: "Apakah tulisan mudah dipahami", maxScore: 2, order: 3 },
    ],
  });

  const soalPBL = await prisma.soal.create({
    data: {
      title: "Grid Galeri Foto",
      description: "Menyusun galeri responsif memakai CSS Grid, dikerjakan bertahap per milestone.",
      learningModel: "PBL",
      topic: "CSS Layout & Flexbox",
      difficulty: 3,
      status: "APPROVED",
      createdById: guru.id,
      language: "css",
    },
  });

  await prisma.milestone.createMany({
    data: [
      { soalId: soalPBL.id, title: "Struktur HTML", description: "Buat struktur HTML dasar untuk galeri foto", order: 1 },
      { soalId: soalPBL.id, title: "Layout Grid", description: "Susun galeri menjadi 3 kolom memakai CSS Grid", order: 2 },
      { soalId: soalPBL.id, title: "Responsif", description: "Buat galeri responsif di berbagai ukuran layar", order: 3 },
    ],
  });

  await prisma.soalAssignment.createMany({
    data: [
      { soalId: soalPS.id, kelasId: kelas.id },
      { soalId: soalTF.id, kelasId: kelas.id },
      { soalId: soalPBL.id, kelasId: kelas.id },
    ],
  });

  console.log("Seed completed successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
