export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: File | string | null;
  parentId: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
  children?: CategoryResponseDto[];
}
