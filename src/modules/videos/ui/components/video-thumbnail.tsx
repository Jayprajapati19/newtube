import Image from "next/image"

export const VideoThumbnail = () => {
    return (
        <div className="relative">
            {/* Thumbnail wrapper  */}
            <div className="relative w-full overflow-hidden  rounded-xl aspect-video ">
                <Image src="/placeholder.svg" alt="Thumbnail" fill className="h-full w-full object-cover" />
            </div>

            {/* video duratio box */}
            {/* TODO: video duration box */}

        </div>

    );
};