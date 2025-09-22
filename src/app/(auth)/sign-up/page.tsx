"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useObjectState } from "@/hooks/use-object-state";
import { cn } from "lib/utils";
import { ChevronLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { UserZodSchema } from "app-types/user";
import { existsByEmailAction } from "@/app/api/auth/actions";
import { authClient } from "auth/client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function SignUpPage() {
  const t = useTranslations();
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useObjectState({
    email: "",
    name: "",
    password: "",
  });

  // Adım açıklamaları
  const steps = [
    t("Auth.SignUp.step1"),
    t("Auth.SignUp.step2"),
    t("Auth.SignUp.step3"),
  ];

  // Yüklenme sırasında işlemleri güvenli çalıştır
  const safeProcessWithLoading = function <T>(fn: () => Promise<T>) {
    setIsLoading(true);
    return safe(() => fn()).watch(() => setIsLoading(false));
  };

  // Önceki adıma geri dön
  const backStep = () => {
    setStep(Math.max(step - 1, 1));
  };

  // 1. Adım: E-posta doğrulaması
  const successEmailStep = async () => {
    const { success } = UserZodSchema.shape.email.safeParse(formData.email);
    if (!success) {
      toast.error(t("Auth.SignUp.invalidEmail"));
      return;
    }

    const exists = await safeProcessWithLoading(() =>
      existsByEmailAction(formData.email),
    ).orElse(false);

    if (exists) {
      toast.error(t("Auth.SignUp.emailAlreadyExists"));
      return;
    }

    setStep(2);
  };

  // 2. Adım: İsim doğrulaması
  const successNameStep = () => {
    const { success } = UserZodSchema.shape.name.safeParse(formData.name);
    if (!success) {
      toast.error(t("Auth.SignUp.nameRequired"));
      return;
    }
    setStep(3);
  };

  // 3. Adım: Şifre ile kayıt
  const successPasswordStep = async () => {
    const { success } = UserZodSchema.shape.password.safeParse(
      formData.password
    );
    if (!success) {
      toast.error(t("Auth.SignUp.passwordRequired"));
      return;
    }

    await safeProcessWithLoading(() =>
      authClient.signUp.email(
        {
          email: formData.email,
          password: formData.password,
          name: formData.name,
        },
        {
          onError(ctx) {
            toast.error(ctx.error.message || ctx.error.statusText);
          },
          onSuccess() {
            router.push("/");
          },
        }
      ),
    ).unwrap();
  };

  return (
    <div className="animate-in fade-in duration-1000 w-full h-full flex flex-col p-4 md:p-8 justify-center relative">
      {/* Giriş sayfasına link */}
      <div className="w-full flex justify-end absolute top-0 right-0">
        <Link href="/sign-in">
          <Button variant="ghost">{t("Auth.SignUp.signIn")}</Button>
        </Link>
      </div>

      <Card className="w-full md:max-w-md bg-background border-none mx-auto gap-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {t("Auth.SignUp.title")}
          </CardTitle>
          <CardDescription className="py-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground text-right">
                {t("Common.back")} {step} / {steps.length}
              </p>
              <div className="h-2 w-full relative bg-input rounded-full overflow-hidden">
                <div
                  style={{ width: `${(step / 3) * 100}%` }}
                  className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                ></div>
              </div>
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">
            {/* 1. Adım: E-posta */}
            {step === 1 && (
              <div className={cn("flex flex-col gap-2")}>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mcp@ornek.com"
                  disabled={isLoading}
                  autoFocus
                  value={formData.email}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      successEmailStep();
                    }
                  }}
                  onChange={(e) => setFormData({ email: e.target.value })}
                  required
                />
              </div>
            )}

            {/* 2. Adım: İsim */}
            {step === 2 && (
              <div className={cn("flex flex-col gap-2")}>
                <Label htmlFor="name">Tam Adınız</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  disabled={isLoading}
                  autoFocus
                  value={formData.name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      successNameStep();
                    }
                  }}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  required
                />
              </div>
            )}

            {/* 3. Adım: Şifre */}
            {step === 3 && (
              <div className={cn("flex flex-col gap-2")}>
                <div className="flex items-center">
                  <Label htmlFor="password">Şifre</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoFocus
                  value={formData.password}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      successPasswordStep();
                    }
                  }}
                  onChange={(e) => setFormData({ password: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Mevcut adımın açıklaması */}
            <p className="text-muted-foreground text-sm mb-6 text-center">
              {steps[step - 1]}
            </p>

            {/* Butonlar */}
            <div className="flex gap-2">
              <Button
                disabled={isLoading}
                className={cn(step === 1 && "opacity-0", "w-1/2")}
                variant="ghost"
                onClick={backStep}
              >
                <ChevronLeft className="size-4" />
                {t("Common.back")}
              </Button>
              <Button
                disabled={isLoading}
                className="w-1/2"
                onClick={() => {
                  if (step === 1) successEmailStep();
                  if (step === 2) successNameStep();
                  if (step === 3) successPasswordStep();
                }}
              >
                {step === 3
                  ? t("Auth.SignUp.createAccount")
                  : t("Common.next")}
                {isLoading && <Loader className="size-4 ml-2 animate-spin" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}