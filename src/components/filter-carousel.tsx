"use client"
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge";

interface FilterCarouselProps {
    value?: string | null;
    isLoading?: boolean;
    onSelecet?: (value: string | null) => void;
    data: {
        value: string;
        label: string;
    }[];
}


export const FilterCarousel = ({
    value,
    onSelecet,
    data,
    isLoading
}: FilterCarouselProps) => {
    return (
        <div className="relative w-full">
            <Carousel
                opts={{
                    align: "start",
                    dragFree: true,
                }}
                className="w-full px-12"
            >
                <CarouselContent className="-ml-3 ">
                    <CarouselItem>
                        <Badge>
                            All
                        </Badge>
                    </CarouselItem>
                </CarouselContent>

            </Carousel>
        </div>

    )
}