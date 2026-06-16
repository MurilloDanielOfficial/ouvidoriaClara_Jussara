package usecases

import "back-end/repository"

type MidiaUseCases struct {
	repository *repository.MidiaRepository
}

func NewMidiaUseCases(repo *repository.MidiaRepository) *MidiaUseCases {
	return &MidiaUseCases{
		repository: repo,
	}
}

func (usecase MidiaUseCases) UploadMidia(linkMidia string) error {
	return usecase.repository.UploadMidia(linkMidia)
}
