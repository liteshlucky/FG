import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log("Attempting login for:", credentials.email);
                try {
                    await dbConnect();
                    console.log("DB Connected");

                    const userCount = await User.countDocuments();
                    console.log("User count:", userCount);

                    if (userCount === 0) {
                        console.log("Creating default admin user...");
                        const hashedPassword = await bcrypt.hash('admin123', 10);
                        await User.create({
                            email: 'admin@fitapp.com',
                            password: hashedPassword,
                            name: 'Admin'
                        });
                        console.log("Default admin created");
                    }

                    const user = await User.findOne({ email: credentials.email });
                    console.log("User found:", user ? "Yes" : "No");

                    if (user) {
                        const isValid = bcrypt.compareSync(credentials.password, user.password);
                        console.log("Password valid:", isValid);
                        if (isValid) {
                            return { id: user._id, name: user.name, email: user.email };
                        }
                    }

                    return null;
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/', // Custom sign-in page (landing page)
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
