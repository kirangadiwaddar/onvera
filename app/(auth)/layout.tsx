import { Marquee } from "@/components/ui/marquee"
import TestimonialCard from "@/components/ui/testimonialCard"
import Logo from "@/components/ui/logo"
import { AuthRedirect } from "@/components/auth-redirect"


const testimonials = [
    {
        message: "Onvera keeps our client work tidy and transparent. The handoffs finally feel effortless.",
        name: "Ava Patel",
        username: "@avapatel",
        role: "Operations Lead, Harbor Studio",
        avatar: "https://avatar.vercel.sh/ava-patel",
    },
    {
        message: "The dashboard gives me a clear pulse on every project without the status-chase.",
        name: "Marcus Reed",
        username: "@marcusreed",
        role: "Founder, Reed & Co.",
        avatar: "https://avatar.vercel.sh/marcus-reed",
    },
    {
        message: "Our team onboarded in a day. It’s calm, focused, and clients love the experience.",
        name: "Sofia Alvarez",
        username: "@sofiaa",
        role: "Client Success, Northlane",
        avatar: "https://avatar.vercel.sh/sofia-alvarez",
    },
    {
        message: "We finally have one place for briefs, updates, and approvals. It just flows.",
        name: "Ethan Brooks",
        username: "@ethanb",
        role: "Creative Director, Fieldhouse",
        avatar: "https://avatar.vercel.sh/ethan-brooks",
    },
    {
        message: "The project timeline view reduced our weekly standups by half. Huge win.",
        name: "Priya Nair",
        username: "@priyanair",
        role: "Product Lead, Bluewave",
        avatar: "https://avatar.vercel.sh/priya-nair",
    },
    {
        message: "Onvera feels crafted for agencies. The client portals look premium out of the box.",
        name: "Liam Chen",
        username: "@liamchen",
        role: "Co-founder, Studio Koi",
        avatar: "https://avatar.vercel.sh/liam-chen",
    },
]

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <AuthRedirect />
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2">
                    <a href="#" className="flex items-center gap-2 font-medium text-2xl">
                        <Logo />
                        Onvera
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        {children}
                    </div>
                </div>
            </div>
            <div className="bg-linear-to-b from-sky-50 to-blue-200 dark:from-violet-500/15! dark:to-slate-950/40! relative hidden lg:flex justify-between flex-col m-5 ml-0! rounded-4xl overflow-x-hidden">
                <div
                    className="absolute inset-0 z-0 top-5 left-5 right-5 bottom-5"
                    style={{
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)',
                        backgroundSize: '24px 24px',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        opacity: 0.2
                    }}
                />
                <div className="title-content p-10 w-md">
                    <h1 className="text-4xl font-medium mb-4">Showcase</h1>
                    <p className="text-md leading-relaxed">Hear what our clients have to say about their experience working with us.</p>
                </div>
                <div className="testimonial-cards-marquee py-16 space-y-8">
                    {/* Left Scroll */}
                    <Marquee pauseOnHover repeat={4} className="[--duration:22s] [--gap:1rem]">
                        {testimonials.map((t, i) => (
                            <TestimonialCard key={i} {...t} />
                        ))}
                    </Marquee>

                    {/* Right Scroll */}
                    <Marquee reverse pauseOnHover repeat={4} className="[--duration:22s] [--gap:1rem]">
                        {testimonials.map((t, i) => (
                            <TestimonialCard key={i} {...t} />
                        ))}
                    </Marquee>
                </div>
            </div>
        </div>
    )
}
