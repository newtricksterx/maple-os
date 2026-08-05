import { Toast } from "radix-ui";
import './ToastMessage.css'

interface ToastMessageProps {
	title: string;
	message: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type?: "success" | "error" | "warning" | "info";
}

const ToastMessage = ({
	title,
	message,
	open,
	onOpenChange,
	type = "info",
}: ToastMessageProps) => {
	return (
		<Toast.Provider swipeDirection="right">
			<Toast.Root
				className={`ToastRoot ${type}`}
				open={open}
				onOpenChange={onOpenChange}
				duration={4000}
			>
				<Toast.Title className="ToastTitle">
					{title}
				</Toast.Title>

				<Toast.Description className="ToastDescription">
					{message}
				</Toast.Description>

				<Toast.Close
					className="ToastClose"
					aria-label="Close"
				>
					×
				</Toast.Close>
			</Toast.Root>

			<Toast.Viewport className="ToastViewport" />
		</Toast.Provider>
	);
};

export default ToastMessage;
