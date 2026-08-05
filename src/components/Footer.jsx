import { Github, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react'
import MagneticButton from './ui/MagneticButton'
import FashionLogo from './ui/FashionLogo'

const footerLinks = {
  Maison: [
    { label: 'AI Search', href: '#ai-search' },
    { label: 'Virtual Try-On', href: '#try-on' },
    { label: 'AI Stylist', href: '#stylist' },
    { label: 'Price Comparison', href: '#compare' }
  ],
  Company: [
    { label: 'About Us', href: '#about' },
    { label: 'Careers', href: '#about' },
    { label: 'Press', href: '#about' },
    { label: 'Blog', href: '#about' }
  ],
  Support: [
    { label: 'Help Center', href: '#profile' },
    { label: 'Privacy Policy', href: '#about' },
    { label: 'Terms of Service', href: '#about' },
    { label: 'Contact Us', href: '#about' }
  ]
}

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' }
]

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 dark:border-white/5 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-2.5 mb-6">
              <FashionLogo />
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg tracking-luxury leading-none text-shine">
                  STYLEVERSE
                </span>
                <span className="font-serif text-[10px] tracking-couture text-secondary dark:text-secondary/70 uppercase mt-1">
                  AI Fashion House
                </span>
              </div>
            </a>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 font-light">
              The world's first AI Fashion Operating System. Search, compare, and try on fashion from anywhere.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <MagneticButton
                  key={social.label}
                  className="w-10 h-10 rounded-full glass dark:glass flex items-center justify-center hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </MagneticButton>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display font-bold text-sm mb-4 tracking-luxury uppercase">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors font-light"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="mt-12 pt-8 border-t border-white/10 dark:border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                hello@styleverse.ai
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                +91 98765 43210
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Mumbai, India
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 font-light">
              © 2024 StyleVerse AI. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}