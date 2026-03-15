import Marquee from "@/components/marquee"
import TestimonialCard from "@/components/ui/testimonialCard"
import Logo from "@/components/ui/logo"
import { AuthRedirect } from "@/components/auth-redirect"


const testimonials = [
    {
        message: "This design system brings consistency and efficiency to our creative process.",
        name: "John Smith",
        role: "Creative Director, StudioX",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg"
    },
    {
        message: "Our team ships faster and with better alignment than ever before.",
        name: "Sarah Miller",
        role: "Product Lead, NovaTech",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
        message: "The design system has transformed our workflow, enabling us to create with ease.",
        name: "David Lee",
        role: "UX Designer, PixelCraft",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
        message: "A game-changer for our design and development teams.",
        name: "Emily Davis",
        role: "Head of Design, BrightWave",
        avatar: "https://randomuser.me/api/portraits/women/68.jpg"
    }
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
                    <Marquee direction="left">
                        {testimonials.map((t, i) => (
                            <TestimonialCard key={i} {...t} />
                        ))}
                    </Marquee>

                    {/* Right Scroll */}
                    <Marquee direction="right">
                        {testimonials.map((t, i) => (
                            <TestimonialCard key={i} {...t} />
                        ))}
                    </Marquee>
                </div>
            </div>
        </div>
    )
}
