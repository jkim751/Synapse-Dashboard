
"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const role = user?.publicMetadata.role;
      if (role) {
        router.push(`/${role}`);
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-start pl-10 bg-cover bg-center bg-no-repeat" style={{backgroundImage: "url('/study_hub.png')"}}>
        <div className="bg-white p-12 rounded-xl shadow-2xl text-center">
          <div className="mb-6">
            <Image
              src="/logo.png" 
              alt="Synapse Logo" 
              className="w-16 h-16 mx-auto animate-spin"
              width={64}
              height={64}
              
            />
          </div>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-48 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded mb-6 w-32 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // If already signed in, show a brief message while redirecting
  if (isSignedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-orange-60">
        <div className="bg-white p-12 rounded-xl shadow-2xl text-center">
          <div className="mb-6">  
            <Image
              src="/logo.png" 
              alt="Synapse Logo" 
              className="w-16 h-16 mx-auto animate-spin"
              width={64}
              height={64}
            />
          </div>
          <p className="text-gray-600 font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-start pl-10 bg-cover bg-center bg-no-repeat" style={{backgroundImage: "url('/study_hub.png')"}}>
      <SignIn.Root>
        <SignIn.Step
          name="start"
          className="bg-white p-12 rounded-xl shadow-2xl flex flex-col gap-2"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={24} 
              height={24}
              priority
              className="w-6 h-auto"
            />
            Synapse Education Dashboard
          </h1>
          <h2 className="text-gray-400">Sign in to your account</h2>
          <Clerk.GlobalError className="text-sm text-red-400" />
          <Clerk.Field name="identifier" className="flex flex-col gap-2">
            <Clerk.Label className="text-xs text-gray-500">
              Username
            </Clerk.Label>
            <Clerk.Input
              type="text"
              required
              className="p-2 rounded-xl ring-1 ring-gray-300 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
            />
            <Clerk.FieldError className="text-xs text-red-400" />
          </Clerk.Field>
          <Clerk.Field name="password" className="flex flex-col gap-2">
            <Clerk.Label className="text-xs text-gray-500">
              Password
            </Clerk.Label>
            <Clerk.Input
              type="password"
              required
              className="p-2 rounded-xl ring-1 ring-gray-300 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
            />
            <Clerk.FieldError className="text-xs text-red-400" />
          </Clerk.Field>
          <SignIn.Action
            submit
            className="bg-orange-500 hover:bg-orange-600 text-white my-1 rounded-xl text-sm p-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign In
          </SignIn.Action>
          <div className="text-center justify-items-center mt-4">
          <a href="https://synapseeducation.com.au/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-sm text-black">Visit Us</span>
              <Image
                src="/logo.png"
                alt="logo"
                width={32}
                height={32}
                className="w-8 h-8 mx-auto"
              />
            </a>
          </div>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
};

export default LoginPage;