'use client';

import Link from "next/link";
import { Facebook, Twitter, Youtube } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    // Hide Footer on Admin and Seller pages
    if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/seller'))) return null;

    return (
        <footer className="bg-[#172337] text-white text-[12px] leading-5 mt-10 border-t border-[#454d5e]">
            <div className="container mx-auto px-4 py-10 max-w-[1248px]">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
                    {/* Column 1: About */}
                    <div>
                        <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">About</h6>
                        <ul className="flex flex-col gap-1.5">
                            <li><Link href="#" className="hover:underline">Contact Us</Link></li>
                            <li><Link href="#" className="hover:underline">About Us</Link></li>
                            <li><Link href="#" className="hover:underline">Careers</Link></li>
                            <li><Link href="#" className="hover:underline">Stories</Link></li>
                            <li><Link href="#" className="hover:underline">Press</Link></li>
                            <li><Link href="#" className="hover:underline">Corporate Information</Link></li>
                        </ul>
                    </div>

                    {/* Column 2: Help */}
                    <div>
                        <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">Help</h6>
                        <ul className="flex flex-col gap-1.5">
                            <li><Link href="#" className="hover:underline">Payments</Link></li>
                            <li><Link href="#" className="hover:underline">Shipping</Link></li>
                            <li><Link href="#" className="hover:underline">Cancellation & Returns</Link></li>
                            <li><Link href="#" className="hover:underline">FAQ</Link></li>
                            <li><Link href="#" className="hover:underline">Report Infringement</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Consumer Policy */}
                    <div>
                        <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">Consumer Policy</h6>
                        <ul className="flex flex-col gap-1.5">
                            <li><Link href="#" className="hover:underline">Cancellation & Returns</Link></li>
                            <li><Link href="#" className="hover:underline">Terms Of Use</Link></li>
                            <li><Link href="#" className="hover:underline">Security</Link></li>
                            <li><Link href="#" className="hover:underline">Privacy</Link></li>
                            <li><Link href="#" className="hover:underline">Sitemap</Link></li>
                            <li><Link href="#" className="hover:underline">EPR Compliance</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Social */}
                    <div>
                        <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">Social</h6>
                        <ul className="flex flex-col gap-1.5">
                            <li><Link href="#" className="hover:underline">Facebook</Link></li>
                            <li><Link href="#" className="hover:underline">Twitter</Link></li>
                            <li><Link href="#" className="hover:underline">YouTube</Link></li>
                        </ul>
                    </div>

                    {/* Vertical Divider for Address */}
                    <div className="md:col-span-2 border-l border-[#454d5e] pl-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">Mail Us:</h6>
                                <p>EMart Internet Private Limited,</p>
                                <p>Buildings Alyssa, Begonia &</p>
                                <p>Clove Embassy Tech Village,</p>
                                <p>Outer Ring Road, Devarabeesanahalli Village,</p>
                                <p>Bengaluru, 560103,</p>
                                <p>Karnataka, India</p>
                            </div>
                            <div>
                                <h6 className="text-[#878787] uppercase mb-3 text-[12px] font-normal">Registered Office Address:</h6>
                                <p>EMart Internet Private Limited,</p>
                                <p>Buildings Alyssa, Begonia &</p>
                                <p>Clove Embassy Tech Village,</p>
                                <p>Outer Ring Road, Devarabeesanahalli Village,</p>
                                <p>Bengaluru, 560103,</p>
                                <p>Karnataka, India</p>
                                <p className="mt-2 text-blue-500">CIN : U51109KA2012PTC066107</p>
                                <p className="text-blue-500">Telephone: 044-45614700</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#454d5e] mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-2 items-center text-white">
                        <span className="bg-[#ffc200] w-3 h-3 rounded-full inline-block"></span>
                        <span>Sell On EMart</span>
                    </div>
                    <div className="flex gap-2 items-center text-white">
                        <span className="bg-[#ffc200] w-3 h-3 rounded-full inline-block"></span>
                        <span>Advertise</span>
                    </div>
                    <div className="flex gap-2 items-center text-white">
                        <span className="bg-[#ffc200] w-3 h-3 rounded-full inline-block"></span>
                        <span>Gift Cards</span>
                    </div>
                    <div className="flex gap-2 items-center text-white">
                        <span className="bg-[#ffc200] w-3 h-3 rounded-full inline-block"></span>
                        <span>Help Center</span>
                    </div>
                    <div className="text-white">
                        © 2007-2025 EMart.com
                    </div>
                </div>
            </div>
        </footer>
    );
}
