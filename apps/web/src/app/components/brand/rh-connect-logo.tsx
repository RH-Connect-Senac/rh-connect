import lightLogo from "../../../assets/brand/logo-rh-connect.svg";
import darkLogo from "../../../assets/brand/logo-rh-connect-fundo-escuro.svg";
import { cn } from "../ui/utils";

type RHConnectLogoVariant = "default" | "light" | "dark" | "inverse";

type RHConnectLogoProps = {
  variant?: RHConnectLogoVariant;
  className?: string;
  alt?: string;
};

const logoByVariant: Record<RHConnectLogoVariant, string> = {
  default: lightLogo,
  light: lightLogo,
  dark: darkLogo,
  inverse: darkLogo,
};

function RHConnectLogo({
  variant = "default",
  className,
  alt = "RH Connect",
}: RHConnectLogoProps) {
  return (
    <img
      src={logoByVariant[variant]}
      alt={alt}
      className={cn("h-8 w-auto shrink-0", className)}
      draggable={false}
    />
  );
}

export { RHConnectLogo };
export type { RHConnectLogoProps, RHConnectLogoVariant };
