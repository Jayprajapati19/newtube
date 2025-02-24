import { useUser } from "@clerk/nextjs"

export const StudioSidebarHeader = () => {

    const { user } = useUser();


    return (
        <div>
            Header
        </div>
    )

}