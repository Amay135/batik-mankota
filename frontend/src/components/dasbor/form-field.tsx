"use client";

import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormControl, FormField as Field, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** Isi sendiri untuk Select/Textarea; default Input. */
  children?: ReactNode;
};

/** Field RHF + Zod; pesan galat mengikuti skema Zod (Bahasa Indonesia). */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  disabled,
  children,
}: Props<T>) {
  return (
    <Field
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {children ?? (
              <Input {...field} type={type} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
