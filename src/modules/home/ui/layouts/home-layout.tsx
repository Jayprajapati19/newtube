interface HomeLayoutProps {
    children: React.ReactNode;
}

export const HomeLayout = ({ children }: HomeLayoutProps) => {
    return (
        <div>
            <div>
                <p>Home Navbar</p>
            </div>
            {children}
        </div>

    )
}
