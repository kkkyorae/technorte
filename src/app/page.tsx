import { redirect } from "next/navigation";
// A página inicial só manda para o dashboard (o middleware manda para o login se não houver sessão)
export default function Home() { redirect("/dashboard"); }
