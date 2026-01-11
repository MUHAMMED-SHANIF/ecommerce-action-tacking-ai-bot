import Image from "next/image";

const banners = [
    "https://placehold.co/1600x270/png?text=Big+Sale+Banner",
    "https://placehold.co/1600x270/png?text=New+Arrivals",
];

export default function Banner() {
    return (
        <div className="relative w-full h-[180px] md:h-[220px] lg:h-[280px] overflow-hidden mt-3">
            {/* For now, just show the first banner as static. Implementing a full slider requires more clientjs or a library */}
            <div className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity">
                <Image
                    src={banners[0]}
                    alt="Banner"
                    fill
                    className="object-cover md:object-fill"
                    priority
                />
            </div>
        </div>
    );
}
