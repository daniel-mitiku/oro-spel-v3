"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken, JWT_SECRET, verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Create JWT token
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    const token = await generateToken(user.id);

    // Set cookie
    (
      await // Set cookie
      cookies()
    ).set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    redirect("/dashboard");
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Registration failed" };
  }
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "Invalid credentials" };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { error: "Invalid credentials" };
    }

    // Use the now async generateToken function
    const token = await generateToken(user.id);

    (await cookies()).set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    // The redirect function throws an error, so you must re-throw it to avoid the client-side code running
    // The previous error was a NEXT_REDIRECT that was being caught and logged but not re-thrown.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: "Login failed" };
  }
}

export async function logoutUser() {
  (await cookies()).delete("auth-token");
  redirect("/login");
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("auth-token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      omit: {
        password: true,
      },
      // select: {
      //   id: true,
      //   name: true,
      //   email: true,
      //   createdAt: true,
      //   updatedAt: true,
      // },
    });

    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}
