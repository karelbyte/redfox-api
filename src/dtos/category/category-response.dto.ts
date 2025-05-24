export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  children?: CategoryResponseDto[];
}
