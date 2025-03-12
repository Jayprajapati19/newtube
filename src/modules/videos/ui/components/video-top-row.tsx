import { VideoGetOneOutput } from "../../types";
import { VideoOwner } from "./video-owner";



interface VideoRowProps {
    video: VideoGetOneOutput;
}


export const VideoRow = ({ video }: VideoRowProps) => {
    return (
        <div className="flex flex-col gap-4 mt-4">
            <h1 className="text-xl font-semibold ">{video.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <VideoOwner user={video.user} videoId={video.id} />
                <div className="flex overflow-x-auto sm:min-w-[calc(50%-6px)] sm:justify-end sm:overflow-visible pb-2 -mb-2 sm:pb-0 sm:-mb-0 gap-2">

                </div>
            </div>
        </div>
    )
}