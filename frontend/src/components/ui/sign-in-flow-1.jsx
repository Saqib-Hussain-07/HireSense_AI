import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAuth as useClerkAuth, SignIn, SignUp, UserButton } from "@clerk/react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// CanvasRevealEffect
// ---------------------------------------------------------------------------

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false,
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={
            opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
          }
          shader={`
            ${reverse ? "u_reverse_active" : "false"}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
          center={["x", "y"]}
        />
      </div>
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// DotMatrix
// ---------------------------------------------------------------------------

const DotMatrix = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  const uniforms = React.useMemo(() => {
    let colorsArray = [
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
    ];
    if (colors.length === 2) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[1],
      ];
    } else if (colors.length === 3) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[2],
        colors[2],
      ];
    }
    return {
      u_colors: {
        value: colorsArray.map((color) => [
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
        ]),
        type: "uniform3fv",
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv",
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f",
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f",
      },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i",
      },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${
              center.includes("x")
                ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }
            ${
              center.includes("y")
                ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            float animation_speed_factor = 0.5;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }

            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      maxFps={60}
    />
  );
};

// ---------------------------------------------------------------------------
// ShaderMaterial (Three.js mesh)
// ---------------------------------------------------------------------------

const ShaderMaterial = ({ source, uniforms, maxFps = 60 }) => {
  const { size } = useThree();
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();
    const material = ref.current.material;
    const timeLocation = material.uniforms.u_time;
    timeLocation.value = timestamp;
  });

  const getUniforms = () => {
    const preparedUniforms = {};

    for (const uniformName in uniforms) {
      const uniform = uniforms[uniformName];

      switch (uniform.type) {
        case "uniform1f":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
          break;
        case "uniform1i":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
          break;
        case "uniform3f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector3().fromArray(uniform.value),
            type: "3f",
          };
          break;
        case "uniform1fv":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
          break;
        case "uniform3fv":
          preparedUniforms[uniformName] = {
            value: uniform.value.map((v) =>
              new THREE.Vector3().fromArray(v)
            ),
            type: "3fv",
          };
          break;
        case "uniform2f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector2().fromArray(uniform.value),
            type: "2f",
          };
          break;
        default:
          console.error(`Invalid uniform type for '${uniformName}'.`);
          break;
      }
    }

    preparedUniforms["u_time"] = { value: 0, type: "1f" };
    preparedUniforms["u_resolution"] = {
      value: new THREE.Vector2(size.width * 2, size.height * 2),
    };
    return preparedUniforms;
  };

  const material = useMemo(() => {
    const materialObject = new THREE.ShaderMaterial({
      vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
      `,
      fragmentShader: source,
      uniforms: getUniforms(),
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });

    return materialObject;
  }, [size.width, size.height, source]);

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Shader (Canvas wrapper)
// ---------------------------------------------------------------------------

const Shader = ({ source, uniforms, maxFps = 60 }) => {
  return (
    <Canvas className="absolute inset-0 h-full w-full pointer-events-none">
      <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  );
};

// ---------------------------------------------------------------------------
// AnimatedNavLink
// ---------------------------------------------------------------------------

const AnimatedNavLink = ({ href, children }) => {
  return (
    <a
      href={href}
      className="group relative block overflow-hidden h-5 text-sm"
    >
      <div className="flex flex-col transition-transform duration-300 ease-out transform group-hover:-translate-y-1/2">
        <span className="text-gray-300 font-display h-5 flex items-center">{children}</span>
        <span className="text-white font-display h-5 flex items-center">{children}</span>
      </div>
    </a>
  );
};

// ---------------------------------------------------------------------------
// MiniNavbar
// ---------------------------------------------------------------------------

export function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn: clerkSignedIn, signOut: clerkSignOut } = useClerkAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);

    if (isOpen) {
      setHeaderShapeClass("rounded-xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass("rounded-full");
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    };
  }, [isOpen]);

  const logoElement = (
    <Link to="/" className="relative w-5 h-5 flex items-center justify-center cursor-pointer group">
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80 group-hover:bg-white group-hover:scale-125 transition-all duration-300" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80 group-hover:bg-white group-hover:scale-125 transition-all duration-300" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80 group-hover:bg-white group-hover:scale-125 transition-all duration-300" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80 group-hover:bg-white group-hover:scale-125 transition-all duration-300" />
    </Link>
  );

  const navLinksData = [
    { label: "Features", href: "#features" },
    { label: "Requirements", href: "#checklist" },
    { label: "Workflow", href: "#steps" },
  ];

  const loginActive = location.pathname === "/login";
  const signupActive = location.pathname === "/signup";

  const isAuthed = !!clerkSignedIn;

  async function logout() {
    if (clerkSignedIn) await clerkSignOut();
    localStorage.removeItem('hiresense_token');
  }

  const loginButtonElement = isAuthed ? (
    <button
      onClick={() => navigate("/dashboard")}
      className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 w-full sm:w-auto"
    >
      Dashboard
    </button>
  ) : (
    <div className="relative group w-full sm:w-auto">
      {loginActive && (
        <div className="absolute inset-0 -m-1 rounded-full bg-gray-100 opacity-50 filter blur-md pointer-events-none" />
      )}
      <button
        onClick={() => navigate("/login")}
        className={cn(
          "relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 w-full sm:w-auto",
          loginActive 
            ? "text-black bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400"
            : "border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white"
        )}
      >
        LogIn
      </button>
    </div>
  );

  const signupButtonElement = isAuthed ? (
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/" />
      <button
        onClick={logout}
        className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 w-full sm:w-auto"
      >
        Logout
      </button>
    </div>
  ) : (
    <div className="relative group w-full sm:w-auto">
      {signupActive && (
        <div className="absolute inset-0 -m-1 rounded-full bg-gray-100 opacity-50 filter blur-md pointer-events-none" />
      )}
      <button
        onClick={() => navigate("/signup")}
        className={cn(
          "relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 w-full sm:w-auto",
          signupActive
            ? "text-black bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400"
            : "border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white"
        )}
      >
        Signup
      </button>
    </div>
  );

  return (
    <header
      className={cn(
        "fixed top-6 left-1/2 transform -translate-x-1/2 z-20",
        "flex flex-col items-center",
        "pl-6 pr-6 py-3 backdrop-blur-sm",
        headerShapeClass,
        "border border-[#333] bg-[#1f1f1f57]",
        "w-[calc(100%-2rem)] sm:w-auto",
        "transition-[border-radius] duration-0 ease-in-out"
      )}
    >
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <div className="flex items-center">{logoElement}</div>

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {!isAuthed ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white transition-all duration-200 cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 cursor-pointer"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200"
              >
                Dashboard
              </button>
              <UserButton afterSignOutUrl="/" />
            </>
          )}
        </div>

        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
        >
          {isOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      <div
        className={cn(
          "sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden",
          isOpen
            ? "max-h-[1000px] opacity-100 pt-4"
            : "max-h-0 opacity-0 pt-0 pointer-events-none"
        )}
      >
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-300 hover:text-white transition-colors w-full text-center font-display"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-3 mt-4 w-full">
          {!clerkSignedIn ? (
            <>
              <button
                onClick={() => { navigate("/login"); setIsOpen(false); }}
                className="w-full px-4 py-2 text-sm font-semibold rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white transition-all duration-200"
              >
                Log In
              </button>
              <button
                onClick={() => { navigate("/signup"); setIsOpen(false); }}
                className="w-full px-4 py-2 text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { navigate("/dashboard"); setIsOpen(false); }}
                className="w-full px-4 py-2 text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200"
              >
                Dashboard
              </button>
              <div className="flex justify-center py-1">
                <UserButton afterSignOutUrl="/" />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Clerk Appearance Configuration (HireSense Dark Obsidian Aesthetic)
// ---------------------------------------------------------------------------

const clerkTheme = {
  elements: {
    rootBox: "w-full max-w-md",
    card: "bg-black/85 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 text-white w-full",
    headerTitle: "text-white font-display text-2xl font-bold tracking-tight",
    headerSubtitle: "text-zinc-400 text-sm",
    socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/25 transition-all rounded-xl",
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/10",
    dividerText: "text-zinc-500 font-mono text-xs uppercase",
    formFieldLabel: "text-zinc-300 font-medium text-xs",
    formFieldInput: "bg-white/5 border border-white/10 text-white rounded-xl focus:border-white/40 focus:ring-1 focus:ring-white/40",
    formButtonPrimary: "bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl py-2.5 transition-all shadow-lg",
    footerActionLink: "text-white hover:underline font-medium",
    footerActionText: "text-zinc-400 text-xs",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-zinc-400 hover:text-white",
  },
  variables: {
    colorPrimary: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#a1a1aa",
    colorBackground: "#09090b",
    colorInputBackground: "rgba(255, 255, 255, 0.05)",
    colorInputText: "#ffffff",
  },
};

// ---------------------------------------------------------------------------
// SignInPage (Clerk Native Authentication)
// ---------------------------------------------------------------------------

export const SignInPage = ({ className }) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col min-h-screen bg-black relative overflow-x-hidden",
        className
      )}
    >
      <div className="absolute inset-0 z-0">
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="bg-black"
          colors={[
            [255, 255, 255],
            [255, 255, 255],
          ]}
          dotSize={6}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.2)_0%,_rgba(0,0,0,0.95)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar />

        <div className="flex-1 flex flex-col items-center justify-center pt-28 pb-12 px-4">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            fallbackRedirectUrl="/setup"
            appearance={clerkTheme}
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SignUpPage (Clerk Native Registration)
// ---------------------------------------------------------------------------

export const SignUpPage = ({ className }) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col min-h-screen bg-black relative overflow-x-hidden",
        className
      )}
    >
      <div className="absolute inset-0 z-0">
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="bg-black"
          colors={[
            [255, 255, 255],
            [255, 255, 255],
          ]}
          dotSize={6}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.2)_0%,_rgba(0,0,0,0.95)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar />

        <div className="flex-1 flex flex-col items-center justify-center pt-28 pb-12 px-4">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            fallbackRedirectUrl="/setup"
            appearance={clerkTheme}
          />
        </div>
      </div>
    </div>
  );
};
