import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/terms-of-service')({
	component: TermsOfServicePage,
});

function TermsOfServicePage() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
			<main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-14">
				<div className="rounded-xl border bg-card p-6 md:p-8 shadow-sm">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('legal.terms.title')}</h1>
					<p className="mt-3 text-sm text-muted-foreground">{t('legal.effectiveDate')}</p>

					<section className="mt-8 space-y-4 text-sm leading-6 text-foreground/90">
						<p>{t('legal.terms.paragraphs.1')}</p>
						<p>{t('legal.terms.paragraphs.2')}</p>
						<p>{t('legal.terms.paragraphs.3')}</p>
						<p>{t('legal.terms.paragraphs.4')}</p>
						<p>
							{t('legal.terms.paragraphs.5')}{' '}
							<a
								href="https://discord.gg/hCjh8e3Y9r"
								target="_blank"
								rel="noreferrer"
								className="text-primary underline underline-offset-2"
							>
								https://discord.gg/hCjh8e3Y9r
							</a>
							.
						</p>
						<p>{t('legal.terms.paragraphs.6')}</p>
						<p>{t('legal.terms.paragraphs.7')}</p>
					</section>
				</div>
			</main>
		</div>
	);
}